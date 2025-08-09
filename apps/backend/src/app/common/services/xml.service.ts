import { convertXML } from 'simple-xml-to-json';
import { create as createXML } from 'xmlbuilder2';

export class XmlService {
  async convertToJSON(xml: string): Promise<any> {
    return convertXML(xml);
  }

  async convertToXML(data: object): Promise<string> {
    const xmlBuilder = createXML(data).end({ prettyPrint: true });
    // Build your XML structure here using xmlBuilder
    return xmlBuilder;
  }
}
